import { Link, type Href } from 'expo-router';
import { useApp } from '@/hooks/use-app';
import { WebBrand } from './brand.web';
import { SiteFooter } from './footer.web';
import { BlogServiceLinks } from './blog-service-links.web';
import { contact, servicePath } from './content';
import { serviceDetails } from './service-details';
import { publicServices } from './service-pages';
import { Seo, siteUrl } from './seo.web';
import './service-quick-start.css';

type Presentation = { title: string; promise: string; action: string; icon: string; documents: string[]; fee?: string };
const presentation: Record<string, Presentation> = {
  company: { title: 'Private limited company', promise: 'Your idea. A company of its own.', action: 'Start company registration', icon: 'company', documents: ['Director & shareholder details', 'Business & ownership plan', 'Registered-office proof'] },
  llp: { title: 'LLP registration', promise: 'Build your partnership with a clear plan.', action: 'Start LLP registration', icon: 'llp', documents: ['Partner details', 'Contribution & profit-sharing plan', 'Office address proof'] },
  gst_registration: { title: 'GST registration', promise: 'Get your GST application in good order.', action: 'Start GST registration', icon: 'gst-registration', documents: ['Business identity', 'Owner or entity details', 'Business-address proof'], fee: '₹1,999' },
  udyam: { title: 'Udyam (MSME) registration', promise: 'Application support, one clear step at a time.', action: 'Apply with RegisterBox', icon: 'new-business', documents: ['Enterprise name & activities', 'Business address & unit locations', 'Existing Udyam or GST certificate, if available'] },
  food: { title: 'FSSAI & food licence', promise: 'You bring the flavour. We help with the paperwork.', action: 'Start FSSAI application', icon: 'food', documents: ['Food activity & products', 'Business details', 'Kitchen or premises information'], fee: '₹3,999' },
  retail: { title: 'Shop & establishment', promise: 'A clear next step for your shop or office.', action: 'Start shop registration', icon: 'retail', documents: ['Owner & establishment details', 'Premises information', 'Workforce details'], fee: '₹4,500' },
  gst: { title: 'GST return support', promise: 'Bring your records together. See what comes next.', action: 'Open GST workspace', icon: 'gst-return', documents: ['GST account information', 'Sales & purchase records', 'Previous filing acknowledgements'] },
  new: { title: 'Start a business', promise: 'A big idea starts with one clear next step.', action: 'Start my business', icon: 'new-business', documents: ['Your business idea', 'Owners or partners', 'Planned location'] },
  online: { title: 'Online & e-commerce', promise: 'Take your business beyond the shopfront.', action: 'Start online-business setup', icon: 'online', documents: ['Products & sales channels', 'Business information', 'Dispatch & storage locations'] },
  manufacturing: { title: 'Manufacturing business', promise: 'Make room for what you want to make.', action: 'Start manufacturing setup', icon: 'manufacturing', documents: ['Products & production process', 'Premises information', 'Workforce & existing registrations'] },
  branch: { title: 'Open a new branch', promise: 'More room for your growing business.', action: 'Start branch application', icon: 'branch', documents: ['Existing business registrations', 'New premises information', 'Proposed branch activities'] },
  existing: { title: 'Business compliance check', promise: 'Know what is in place and what needs attention.', action: 'Start compliance check', icon: 'business-check', documents: ['Current registrations', 'Recent acknowledgements', 'Deadlines & open questions'] },
  trademark: { title: 'Trademark application', promise: 'Your brand has a name. Give it a plan.', action: 'Discuss my trademark', icon: 'business-check', documents: ['Brand name or logo', 'Applicant details', 'Goods or services'] },
};

function Arrow() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>;
}

function Check() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>;
}

export default function ServicePage({ slug }: { slug: string }) {
  const { session } = useApp();
  const service = publicServices.find(item => item.slug === slug);
  if (!service) return <div className="rb-public-page rb-qs-page"><header className="rb-public-header rb-container"><WebBrand/></header><main className="rb-container rb-qs-missing"><h1>Let’s find the right service.</h1><p>Explore the services available for your business.</p><Link className="rb-button" href="/services">View all services <Arrow/></Link></main><SiteFooter/></div>;
  const ui = presentation[service.category] || { title: service.title, promise: service.detail, action: 'Discuss this service', icon: 'business-check', documents: ['Business details', 'Your requirement', 'Existing registrations'] };
  const details = serviceDetails[service.category] || { audience: 'Business owners preparing brand information and documents for a scoped discussion.', prepare: ui.documents, question: 'Does an application guarantee registration?', answer: 'Filing and authority approval are separate stages. Discuss the scope and appropriate professional review before proceeding.' };
  const isEnquiry = service.category === 'trademark' || !presentation[service.category];
  const isUdyam = service.category === 'udyam';
  const startHref: Href = isEnquiry ? `/contact?service=${encodeURIComponent(service.category)}` as Href : session ? servicePath(service.category) as Href : { pathname: '/auth', params: { next: servicePath(service.category) } };
  const path = `/services/${service.slug}`;
  const steps = isEnquiry ? [
    ['Tell us about your brand', 'Share your proposed name or logo and the goods or services it will identify.'],
    ['Discuss the scope', 'The team confirms the preparation, documents and separate charges involved.'],
    ['Review your next step', 'Check the applicant information before authorising the agreed work.'],
  ] : isUdyam ? [
    ['Choose your business', 'Sign in and start your Udyam assistance application.'],
    ['Share the enterprise details', 'Answer questions about your activity, locations and registration status. Add existing certificates if available.'],
    ['Review & send to RegisterBox', 'Check your answers and send them to our team. We confirm the assistance scope and guide your next steps.'],
  ] : service.category === 'gst' ? [
    ['Choose your business', 'Sign in and select the business you want to manage.'],
    ['Prepare the return', 'Connect the GST account and review records for the correct period.'],
    ['Review the real status', 'Check the final figures and the actual filing acknowledgement.'],
  ] : [
    ['Choose your business', 'Sign in, then select an existing business or add a new one.'],
    ['Answer simple questions', 'Tell us about your activity, people and business location.'],
    ['Add documents & save', 'Follow your checklist and return to your application when you are ready.'],
  ];
  return <div className="rb-public-page rb-qs-page">
    <Seo title={`${ui.title} in Bengaluru | RegisterBox`} description={isUdyam ? 'Apply for paid Udyam registration assistance from RegisterBox. Prepare enterprise details, add existing certificates and get guidance on the official process.' : `${ui.title} support from RegisterBox. See the document checklist, understand the next steps and start your application online.`} path={path} schema={[
      { '@type': 'Service', name: ui.title, description: service.detail, url: `${siteUrl}${path}`, provider: { '@id': `${siteUrl}/#organization` }, areaServed: { '@type': 'Country', name: 'India' } },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` }, { '@type': 'ListItem', position: 2, name: 'Services', item: `${siteUrl}/services` }, { '@type': 'ListItem', position: 3, name: ui.title, item: `${siteUrl}${path}` }] },
    ]}/>
    <a className="rb-qs-skip" href="#application-start">Skip to application steps</a>
    <header className="rb-public-header rb-container rb-qs-header"><WebBrand/><Link href="/services">All services <span aria-hidden="true">↗</span></Link></header>
    <main className="rb-container rb-qs-main">
      <nav className="rb-qs-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/services">Services</Link><span aria-hidden="true">/</span><span>{ui.title}</span></nav>
      <section className="rb-qs-hero" aria-labelledby="service-title">
        <div className="rb-qs-intro"><p className="rb-qs-eyebrow"><span aria-hidden="true"/> {service.group} · RegisterBox</p><h1 id="service-title">{ui.title}<span className="rb-qs-dot">.</span></h1><p className="rb-qs-promise">{ui.promise}</p><p className="rb-qs-summary">{service.detail}</p>
          {isUdyam && <aside className="rb-qs-authority-note" aria-label="Udyam application assistance scope"><strong>Guidance from application to next steps.</strong><p>We help prepare and review your enterprise information. You complete the official verification and declarations yourself; the government issues the certificate.</p><a href="https://udyamregistration.gov.in/" target="_blank" rel="noopener noreferrer">Official Udyam reference <span aria-hidden="true">↗</span></a></aside>}
          <div className="rb-qs-main-actions"><Link className="rb-button rb-qs-primary" href={startHref}>{ui.action}<Arrow/></Link><a className="rb-qs-help" href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}>Call us first <span aria-hidden="true">↗</span></a></div>
          <p className="rb-qs-action-note">{isEnquiry ? 'Share your requirement. The team will discuss the scope with you.' : session ? 'Continue with your business in the RegisterBox workspace.' : 'Sign in to keep your business information and documents together.'}</p>
          <div className="rb-qs-fee"><span>{isUdyam ? 'Paid application assistance' : ui.fee ? 'RegisterBox assistance fee' : 'Scope and charges'}</span><strong>{isUdyam ? 'A quote for your application' : ui.fee || 'A quote for your business'}</strong><p>{isUdyam ? 'Your quote covers the agreed preparation, review and guidance. Confirm the scope and assistance fee before work begins.' : ui.fee ? 'Government charges and taxes, where applicable, are separate. Confirm the scope before proceeding.' : 'Tell us what you need. Scope and fees are agreed before paid work begins.'}</p></div>
        </div>
        <aside className="rb-qs-preview" aria-labelledby="prepare-preview-title"><div className="rb-qs-preview-top"><span className="rb-qs-preview-label">YOUR NEXT CHAPTER</span><img src={`/images/${ui.icon}-v1.webp`} width="160" height="160" alt="" fetchPriority="high"/></div><div className="rb-qs-paper"><span className="rb-qs-paper-tag">A little preparation goes a long way</span><h2 id="prepare-preview-title">Keep these handy.</h2><ul>{ui.documents.map(item => <li key={item}><span><Check/></span>{item}</li>)}</ul><a href="#documents">See the full checklist <span aria-hidden="true">↓</span></a></div></aside>
      </section>
      <div className="rb-qs-reassurance"><span><Check/> Save and return to your details</span><span><Check/> Clear scope before work begins</span><span><Check/> Help from our Bengaluru team</span></div>
      <section className="rb-qs-steps" id="application-start" aria-labelledby="start-title"><div className="rb-qs-section-head"><div><p className="rb-qs-eyebrow">HOW TO GET STARTED</p><h2 id="start-title">Your next three steps.</h2></div><p>{isEnquiry ? 'Start with a conversation about your brand.' : 'Use the blue button above to begin. Your service choice follows you into your account.'}</p></div><ol>{steps.map(([title, description], index) => <li key={title}><span className="rb-qs-step-number">0{index + 1}</span><h3>{title}</h3><p>{description}</p></li>)}</ol><div className="rb-qs-step-footer"><span>{isUdyam ? 'Sending to RegisterBox creates a preparation case. It does not submit an official Udyam registration or issue a certificate.' : isEnquiry ? 'The enquiry does not submit a government application.' : 'Saving your details prepares a draft. Review and government submission are later steps.'}</span></div></section>
      <section className="rb-qs-details" id="documents" aria-labelledby="details-title"><div className="rb-qs-section-head"><div><p className="rb-qs-eyebrow">A FEW USEFUL DETAILS</p><h2 id="details-title">Start informed.</h2></div><p>Open the questions you need. Your next step stays within reach.</p></div>
        <details><summary>What should I prepare?<span aria-hidden="true">+</span></summary><div className="rb-qs-detail-body"><ul>{details.prepare.map(item => <li key={item}>{item}</li>)}</ul><p>{isUdyam ? 'Upload an existing Udyam or GST certificate only if available. These supporting records are optional. Keep Aadhaar copies, identity numbers and OTPs out of the application.' : 'The final checklist depends on your activity and application route. Share private documents through the agreed secure workspace.'}</p></div></details>
        <details><summary>Is this the right service for my business?<span aria-hidden="true">+</span></summary><div className="rb-qs-detail-body"><p>{details.audience}</p><p>If you are unsure, tell our team your activity and location before confirming the application scope.</p></div></details>
        <details><summary>How do fees, review and submission work?<span aria-hidden="true">+</span></summary><div className="rb-qs-detail-body"><p>{isUdyam ? 'RegisterBox charges for the agreed application preparation, review and guidance. The government does not charge a filing fee for official Udyam registration. Your assistance fee is not a government charge.' : ui.fee ? `The RegisterBox assistance fee is ${ui.fee}. Government charges and taxes, where applicable, are separate.` : 'Ask for a written quote covering the work you need. Assistance, government charges and taxes should be identified separately.'}</p><p>{isUdyam ? 'Sending this application starts your RegisterBox case. You complete official verification and declarations on the government portal; its issuing decision is separate from our assistance.' : 'Confirm the agreed scope before paid work begins. Saving a draft, professional review, government submission and an issued approval are separate stages. Requirements and processing depend on the authority and business. An application does not guarantee an approval or a date.'}</p></div></details>
        <details><summary>{details.question}<span aria-hidden="true">+</span></summary><div className="rb-qs-detail-body"><p>{details.answer}</p></div></details>
      </section>
      <BlogServiceLinks category={service.category}/>
      <section className="rb-qs-next" aria-labelledby="next-title"><div><p className="rb-qs-eyebrow">WHEN YOU ARE READY</p><h2 id="next-title">Let’s take the next step.</h2><p>{isEnquiry ? 'Tell us about your brand and the help you need.' : 'Bring your business details together, one question at a time.'}</p></div><Link className="rb-button" href={startHref}>{ui.action}<Arrow/></Link></section>
      <section className="rb-qs-related" aria-labelledby="related-title"><h2 id="related-title">Explore other services.</h2><div>{publicServices.filter(item => item.category !== service.category).map(item => <Link key={item.slug} href={`/services/${item.slug}` as Href}><span>{presentation[item.category]?.title || item.title}</span><Arrow/></Link>)}</div></section>
    </main>
    <SiteFooter/>
    <div className="rb-qs-mobile-action" aria-label="Start this service"><span><small>{ui.title}</small><strong>{isUdyam ? 'Paid application assistance' : ui.fee ? `${ui.fee} assistance fee` : 'Scope & quote first'}</strong></span><Link className="rb-button" href={startHref}>{isUdyam ? ui.action : isEnquiry ? 'Enquire' : service.category === 'gst' ? 'Open workspace' : 'Start application'}<Arrow/></Link></div>
  </div>;
}
