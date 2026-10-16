import { Link, type Href } from 'expo-router';
import { WebBrand } from './brand.web';
import { branches, contact } from './content';
import { ContactActions, CustomerFeedback } from './local-support.web';
import { Seo, siteUrl } from './seo.web';
import './business-licence-local.css';

const licenceServices = [
  ['GST registration', '/services/gst-registration', 'GSTIN application preparation, document checklist and registration support.'],
  ['FSSAI registration & licence', '/services/fssai-food-business', 'Food-business eligibility guidance and FoSCoS application support.'],
  ['Shop & establishment', '/services/shop-establishment-registration', 'State-specific establishment registration checklist and application support.'],
  ['Trademark application', '/services/trademark-registration', 'Trademark class, applicant and supporting-document preparation.'],
  ['Private limited company', '/services/private-limited-company-registration', 'Company incorporation preparation for founders and directors.'],
  ['GST return filing', '/services/gst-returns', 'GSTR-1, GSTR-3B and nil-return preparation and tracking.'],
] as const;

const faq = [
  ['Which business licence do I need in Bengaluru?', 'It depends on your activity, premises and business structure. Food businesses commonly need FSSAI, many establishments need Karnataka Shops and Commercial Establishments registration, and some activities need a municipal trade licence. RegisterBox can review your case before you apply.'],
  ['Can RegisterBox help with GST and FSSAI together?', 'Yes. You can ask about both services in one enquiry. The applications, government portals, documents, fees and approval decisions remain separate.'],
  ['Is RegisterBox a government office?', 'No. RegisterBox is a private business-support service. Government registrations and approvals are issued by the relevant authorities.'],
  ['Can I visit a Bengaluru branch?', 'Yes. Call before visiting to confirm availability and the documents relevant to your service.'],
];

export default function BusinessLicenceLocalPage({ area }: { area?: 'new-thippasandra' | 'marathahalli' }) {
  const branch = area ? branches.find(item => item.id === area) : undefined;
  const place = branch?.name || 'Bengaluru';
  const slug = branch ? `business-licence-${branch.id}` : 'business-licence-bengaluru';
  const path = `/services/${slug}`;
  const title = `Business Licence & Registration in ${place} | RegisterBox`;
  const description = `Business licence, GST, FSSAI, trademark and company registration support in ${place}, Bengaluru. Call or WhatsApp RegisterBox at ${contact.phone}.`;
  const schema = [
    { '@type': 'Service', name: `Business licence and registration support in ${place}`, serviceType: 'Business registration and licence application support', provider: { '@id': `${siteUrl}/#organization` }, areaServed: { '@type': 'Place', name: branch ? `${place}, Bengaluru` : 'Bengaluru' }, url: `${siteUrl}${path}`, hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Business registration services', itemListElement: licenceServices.map(([name, href]) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name, url: `${siteUrl}${href}` } })) } },
    { '@type': 'FAQPage', mainEntity: faq.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) },
  ];
  return <div className="rb-public-page rb-local-landing">
    <Seo title={title} description={description} path={path} schema={schema}/>
    <header className="rb-public-header rb-container"><WebBrand/><Link href="/services">← All services</Link></header>
    <main className="rb-container">
      <section className="rb-local-hero">
        <div className="rb-eyebrow">BUSINESS SUPPORT IN {place.toUpperCase()}</div>
        <h1>Business licences and registrations, made clearer.</h1>
        <p>Tell us what your business does and where it operates. We’ll help you identify the likely registrations, prepare the relevant information and move into the correct application flow.</p>
        <ContactActions service={`business licences and registrations in ${place}`}/>
        <p className="rb-local-proof">Call or WhatsApp <a href={contact.telephoneHref}>{contact.phone}</a> · Bengaluru support · No sign-in needed for an enquiry</p>
      </section>
      <section className="rb-local-service-section" aria-labelledby="local-services-title">
        <div><div className="rb-eyebrow">CHOOSE THE JOB TO BE DONE</div><h2 id="local-services-title">What do you need help with?</h2><p>Open a service to see its checklist, price information and online starting point.</p></div>
        <div className="rb-local-service-grid">{licenceServices.map(([name, href, detail]) => <Link key={href} href={href as Href}><span>{name}</span><p>{detail}</p><b>View service →</b></Link>)}</div>
      </section>
      <section className="rb-local-address">
        <div><div className="rb-eyebrow">LOCAL BENGALURU SUPPORT</div><h2>{branch ? `RegisterBox in ${branch.name}` : 'Visit RegisterBox in Bengaluru'}</h2><p>{branch ? 'This page is for customers looking for nearby registration and licence support.' : 'Choose the branch that is convenient for you. Call before visiting to confirm availability.'}</p></div>
        <div className="rb-branch-grid">{(branch ? [branch] : branches).map(item => <article key={item.id}><h3>{item.name}</h3><address>{item.address}</address><a href={item.maps} target="_blank" rel="noopener noreferrer">Get directions ↗</a></article>)}</div>
      </section>
      <section className="rb-local-faq"><div className="rb-eyebrow">COMMON QUESTIONS</div><h2>Before you start</h2>{faq.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</section>
      <CustomerFeedback/>
    </main>
    <footer className="rb-public-footer rb-container"><span>© {new Date().getFullYear()} RegisterBox</span><Link href="/contact">Contact & branches</Link></footer>
  </div>;
}
