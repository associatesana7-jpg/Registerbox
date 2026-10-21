import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { useApp } from '@/hooks/use-app';
import { WebBrand } from './brand.web';
import { contact } from './content';
import { Seo, siteUrl } from './seo.web';

const path = '/services/free-nil-gst-filing';
const description = 'File eligible nil GSTR-1 and GSTR-3B returns with a ₹0 RegisterBox service fee. Check eligibility, review your return and authorize filing in your GST workspace.';
const eligibility = [
  'Select the correct GSTIN, return and completed tax period. Registration type, filing frequency and previous-return requirements must allow filing.',
  'Review complete books and GST records for every disclosure required by that form. No sales or zero tax alone does not establish nil eligibility.',
  'For GSTR-3B, check purchases, reverse charge, input tax credit, adjustments, interest and late fee as well as outward supplies. Any reportable activity or payable amount needs review before choosing nil.',
  'Check current portal filing status. An already-filed return cannot be filed again; unresolved processing or eligibility blocks must be addressed first.',
];
const steps = [
  ['Connect your business', 'Sign in to RegisterBox, select your business and connect your GST account through the authorized OTP flow.'],
  ['Choose & review', 'Choose GSTR-1 or GSTR-3B and your period. Check the records, filing status and nil declarations before continuing.'],
  ['Authorize & confirm', 'Review the exact return and authorize filing. Confirm the GST acknowledgement and filed status to know it is complete.'],
];
const faqs = [
  ['Is nil GST return filing really free?', 'Yes. RegisterBox charges ₹0 for eligible nil GSTR-1 and nil GSTR-3B filing through this workspace. The offer covers the nil filing service; it does not waive tax, interest, statutory late fee or any other government dues. Other work is scoped and quoted separately.'],
  ['Can I file nil if I had no sales?', 'Not automatically. Your complete records and the conditions for the selected form must support nil. Purchases, reverse charge, input tax credit, adjustments or other reportable entries can mean a regular return is needed even when there were no sales.'],
  ['Does this include both GSTR-1 and GSTR-3B?', 'The ₹0 service fee covers eligible nil GSTR-1 and nil GSTR-3B. Each return has its own checks and must apply to your GST registration and period. Filing one does not mean the other has been filed.'],
  ['What if my return is not eligible for nil?', 'Use the regular-return route or ask our team to review the requirement. Regular filing, reconciliation and other assistance are outside this free nil filing offer; any paid scope and fee are confirmed before work begins.'],
  ['What do I need before starting?', 'Keep your GSTIN, GST portal username, access to the registered OTP contact, authorized-signatory details and complete records for the period ready. Review earlier filings and any pending portal issues. Do not share your GST password in an enquiry.'],
  ['When is my return actually filed?', 'A saved draft or an OTP request is not a filed return. Check the authoritative GST filed status and acknowledgement or ARN for the correct GSTIN, return and period. Portal processing or rejection may need follow-up.'],
];

function Icon({ name }: { name: 'check' | 'arrow' | 'file' }) {
  const paths = { check: 'm5 12 4 4L19 6', arrow: 'M5 12h14m-6-6 6 6-6 6', file: 'M14 3H6a1 1 0 0 0-1 1v16h14V8l-5-5Zm0 0v6h5M8 13h8M8 17h5' };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}

function Detail({ title, children }: { title: string; children: ReactNode }) {
  return <details className="rb-sx-disclosure"><summary><span>{title}</span><span className="rb-sx-plus" aria-hidden="true">+</span></summary><div className="rb-sx-disclosure-body">{children}</div></details>;
}

export default function FreeNilGstFilingPage() {
  const { session, demoMode } = useApp();
  const startHref: Href = session && !demoMode ? '/gst' : { pathname: '/auth', params: { next: '/gst' } };
  const schema = [
    {
      '@type': 'Service', name: 'Free nil GST return filing', description, url: `${siteUrl}${path}`,
      serviceType: 'Eligible nil GSTR-1 and GSTR-3B return filing',
      provider: { '@id': `${siteUrl}/#organization` },
      offers: {
        '@type': 'Offer', url: `${siteUrl}${path}`, price: 0, priceCurrency: 'INR',
        description: '₹0 RegisterBox service fee for eligible nil GSTR-1 and nil GSTR-3B filing. Government dues and other services are separate.',
      },
    },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Services', item: `${siteUrl}/services` },
      { '@type': 'ListItem', position: 3, name: 'Free nil GST filing', item: `${siteUrl}${path}` },
    ] },
  ];
  return <div className="rb-public-page rb-sx-page rb-sx-blue">
    <Seo title="Free Nil GST Return Filing | GSTR-1 & GSTR-3B | RegisterBox" description={description} path={path} schema={schema}/>
    <header className="rb-public-header rb-container"><WebBrand/><Link href="/services">All services <span aria-hidden="true">↗</span></Link></header>
    <main className="rb-container rb-sx-main">
      <nav className="rb-sx-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/services">Services</Link><span>/</span><span>Free nil GST filing</span></nav>
      <section className="rb-sx-hero" aria-labelledby="nil-title">
        <div className="rb-sx-intro">
          <div className="rb-sx-kicker"><span/> GSTR-1 · GSTR-3B · NIL RETURNS</div>
          <h1 id="nil-title">Free nil GST filing<span className="rb-sx-title-dot">.</span></h1>
          <p className="rb-sx-promise">Eligible nil returns. ₹0 RegisterBox service fee.</p>
          <p className="rb-sx-audience">Review your eligibility and file through your GST workspace. Government dues, if any, are separate.</p>
          <div className="rb-service-actions"><Link className="rb-button" href={startHref}>Start free nil filing <Icon name="arrow"/></Link><a className="rb-secondary-button" href="#nil-eligibility">Check eligibility</a></div>
          <p className="rb-sx-audience">Sign in, then select your business, return and period. Nothing is filed until you review and authorize it.</p>
          <ul className="rb-sx-benefits">{['Eligible nil GSTR-1 & GSTR-3B', 'Review before authorization', 'GST acknowledgement tracking'].map(item => <li key={item}><span><Icon name="check"/></span>{item}</li>)}</ul>
        </div>
        <aside className="rb-sx-start-card" aria-label="Free nil filing offer">
          <div className="rb-sx-card-visual"><div className="rb-sx-visual-ring"/><img src="/images/gst-return-v1-136.webp" width="112" height="112" alt="" fetchPriority="high"/><span className="rb-sx-visual-label">YOUR NIL RETURN WORKSPACE</span></div>
          <div className="rb-sx-card-body">
            <div className="rb-sx-price-label">REGISTERBOX NIL FILING SERVICE FEE</div><div className="rb-sx-price">₹0 · Free</div>
            <p>For eligible nil GSTR-1 and GSTR-3B. Tax, interest, statutory late fee and other government dues are not waived. Other services are quoted separately.</p>
            <Link className="rb-button rb-sx-primary" href={startHref}>Start free nil filing <Icon name="arrow"/></Link>
            <small>Choose your GSTIN and period after sign-in</small>
            <a className="rb-sx-call" href={`${contact.whatsapp}?text=${encodeURIComponent('Hi RegisterBox, I need help checking eligibility for free nil GST filing.')}`} target="_blank" rel="noopener noreferrer">Need help checking eligibility? Chat with us ↗</a>
          </div>
        </aside>
      </section>

      <div className="rb-sx-confidence"><span><Icon name="check"/> ₹0 service fee for eligible nil returns</span><span><Icon name="check"/> Your approval before filing</span><span><Icon name="check"/> Verify filed status</span></div>

      <section className="rb-sx-journey" aria-labelledby="nil-steps-title">
        <div className="rb-sx-section-heading"><div><div className="rb-sx-kicker">THREE STEPS TO YOUR RETURN</div><h2 id="nil-steps-title">Check. Review. File.</h2></div><p>Each return and period has its own eligibility and authorization checks.</p></div>
        <ol className="rb-sx-step-grid">{steps.map(([title, text], i) => <li key={title}><span className="rb-sx-step-no">0{i + 1}</span><div><h3>{title}</h3><p>{text}</p></div>{i < 2 && <span className="rb-sx-step-arrow" aria-hidden="true">→</span>}</li>)}</ol>
      </section>

      <section className="rb-sx-documents" id="nil-eligibility" aria-labelledby="nil-eligibility-title">
        <div className="rb-sx-section-heading"><div><div className="rb-sx-kicker">CHECK BEFORE CHOOSING NIL</div><h2 id="nil-eligibility-title">No sales is only one check.</h2></div><p>A nil return must match your complete records and the selected form.</p></div>
        <ul className="rb-sx-detail-list">{eligibility.map(item => <li key={item}>{item}</li>)}</ul>
        <div className="rb-sx-document-grid">{['GSTIN & portal username', 'Complete period records', 'Authorized signatory & OTP access'].map((item, i) => <div className="rb-sx-document" key={item}><span className="rb-sx-file-icon"><Icon name="file"/></span><span><small>0{i + 1}</small><h3>{item}</h3></span></div>)}</div>
      </section>

      <section className="rb-sx-finer-details" aria-labelledby="nil-questions-title">
        <div className="rb-sx-section-heading"><div><div className="rb-sx-kicker">BEFORE YOU START</div><h2 id="nil-questions-title">Your nil filing questions.</h2></div></div>
        {faqs.map(([question, answer]) => <Detail key={question} title={question}><p>{answer}</p></Detail>)}
        <Detail title="Official guidance & service information"><ul className="rb-source-list">
          <li><a href="https://tutorial.gst.gov.in/userguide/returns/GSTR3B.htm" target="_blank" rel="noopener noreferrer">GST Portal — GSTR-3B guidance ↗</a><span>Check the official return instructions and nil-return conditions.</span></li>
          <li><a href="https://tutorial.gst.gov.in/userguide/returns/GSTR_1.htm" target="_blank" rel="noopener noreferrer">GST Portal — GSTR-1 guidance ↗</a><span>Check applicability, return contents and filing requirements.</span></li>
        </ul><p>Updated 21 October 2026 by RegisterBox. This page explains the service offer and general preparation checks. Confirm current requirements and the facts for your GSTIN and period before filing. RegisterBox is an independent service provider.</p><Link href="/policies">Read our privacy and service information ↗</Link></Detail>
      </section>

      <section className="rb-sx-bottom" aria-labelledby="nil-next-title"><div><div className="rb-sx-kicker">START WITH YOUR BUSINESS</div><h2 id="nil-next-title">Ready to check your nil return?</h2><p>Open the workspace, choose your period and review before filing.</p></div><div><Link className="rb-button" href={startHref}>Start free nil filing <Icon name="arrow"/></Link><Link href="/services/gst-returns">Need regular GST return support? ↗</Link></div></section>
      <section className="rb-sx-related" aria-labelledby="nil-related-title"><h2 id="nil-related-title">More help for your business.</h2><div><Link href="/services/gst-registration">GST registration <Icon name="arrow"/></Link><Link href="/services/gst-returns">GST return filing <Icon name="arrow"/></Link><Link href="/services/business-compliance-check">Business compliance check <Icon name="arrow"/></Link><Link href="/services">Explore all services <Icon name="arrow"/></Link></div></section>
      <footer className="rb-sx-footer"><WebBrand/><Link href="/policies">Privacy & service information</Link></footer>
    </main>
    <div className="rb-sx-mobile-action"><span><small>Eligible nil GST filing</small><b>₹0 RegisterBox service fee</b></span><Link className="rb-button" href={startHref}>Start free nil filing ↗</Link></div>
  </div>;
}
