import { SiteFooter } from '@/components/website/footer.web';
import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { useApp } from '@/hooks/use-app';
import { WebBrand } from '@/components/website/brand.web';
import { Seo, siteUrl } from '@/components/website/seo.web';
import { contact } from '@/components/website/content';
import '@/components/website/service-entry.css';
import '@/components/website/service-experience.css';
import '@/components/website/services-answers.css';
import { publicServices, publicServicePath, publicServiceStartPath, servicePackagesForCategory } from '@/components/website/service-pages';
import { serviceDetails } from '@/components/website/service-details';
import { servicePresentation } from '@/components/website/service-presentation';
import { packagePrice } from '@/components/website/service-packages.web';

const groups = ['All services', 'Start a business', 'Registrations', 'Manage & comply'];
export default function ServicesPage() {
  const { session } = useApp();
  const [group, setGroup] = useState('All services');
  const [query, setQuery] = useState('');
  const foodPackage = servicePackagesForCategory('food')[0];
  const foodPrice = foodPackage ? packagePrice(foodPackage.amountPaise) : null;
  const shown = publicServices.filter(service => (group === 'All services' || group === service.group) && `${service.title} ${service.detail} ${servicePresentation[service.category].title}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="rb-public-page rb-sx-page rb-sx-catalog">
    <Seo title="Which Business Registration Do I Need in Bengaluru? | RegisterBox" description="Choose a business registration or compliance service by your activity, location and existing records. Compare package scope, documents, government-fee inclusions and practical next steps." path="/services" schema={[{ '@type': 'ItemList', itemListElement: publicServices.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.title, url: `${siteUrl}/services/${item.slug}` })) }]}/>
    <header className="rb-public-header rb-container"><WebBrand/><a href={contact.telephoneHref}>Call our team ↗</a></header>
    <main className="rb-container rb-sx-main">
      <section className="rb-sx-catalog-intro rb-sa-intro" aria-labelledby="services-question"><div className="rb-sx-kicker">BENGALURU BUSINESS SUPPORT</div><h1 id="services-question">Which registration does my business need in Bengaluru?</h1><p>Choose the registration or compliance support your business needs. See the fee, check the scope and start your application—or speak to our Bengaluru team.</p><div className="rb-sx-catalog-intro-actions"><a className="rb-button" href="#service-catalog">Find my service & price <span aria-hidden="true">↓</span></a><a href={contact.telephoneHref}>Call our team ↗</a></div><div className="rb-sx-catalog-count"><span className="rb-sx-count-dot"/> New Thippasandra & Marathahalli</div></section>
      <aside className="rb-sx-catalog-help"><span aria-hidden="true">₹0</span><div><h2>Nil GST filing. Zero service fee.</h2><p>Eligible nil GSTR-1 and GSTR-3B returns stay free. Check eligibility and your filing period first.</p></div><Link className="rb-button" href={'/services/free-nil-gst-filing' as Href}>Explore free nil filing ↗</Link></aside>
      <section id="service-catalog" aria-label="Find a service">
        <div className="rb-sx-catalog-tools"><div className="rb-sx-catalog-filters" role="group" aria-label="Service category">{groups.map(item => <button type="button" key={item} aria-pressed={group === item} onClick={() => setGroup(item)}>{item}</button>)}</div><label className="rb-sx-catalog-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try GST, FSSAI or company" aria-label="Search services"/></label></div>
        <p className="rb-sx-result-count" role="status">{shown.length} {shown.length === 1 ? 'service' : 'services'}{query.trim() ? ` matching “${query.trim()}”` : ' to help you move forward'}</p>
        <div className="rb-sx-catalog-grid">{shown.map(service => {
          const ui = servicePresentation[service.category];
          const packages = servicePackagesForCategory(service.category);
          const registration = ['gst_registration', 'food', 'retail', 'udyam'].includes(service.category);
          const pricing = service.category === 'gst_nil' ? '₹0' : packages.length ? `${packages.length > 1 ? 'From ' : ''}${packagePrice(Math.min(...packages.map(item => item.amountPaise)))}` : ['company', 'llp'].includes(service.category) ? serviceDetails[service.category]?.pricing?.value : undefined;
          const destination = publicServiceStartPath(service.category);
          const startHref: Href = !session && destination.startsWith('/onboarding/') ? { pathname: '/auth', params: { next: destination } } : packages.length || session ? destination as Href : { pathname: '/auth', params: { next: destination } };
          return <article key={service.slug} className={`rb-sx-catalog-card rb-sx-${ui.tone}`}>
            <div className="rb-sx-catalog-art"><img src={`/images/${ui.icon}-v1-136.webp`} width="76" height="76" alt={`${service.title} service illustration`} loading="lazy"/><span>{service.group}</span></div>
            <div className="rb-sx-catalog-card-body"><h2><Link href={`/services/${service.slug}` as Href} asChild><a>{ui.title}</a></Link></h2><div className="rb-sx-catalog-card-fee"><small>{pricing && !/quotation|quote/.test(pricing) ? service.category === 'food' ? 'Eligible Basic package' : 'Assistance fee' : 'For your business'}</small><b className={!pricing || /quotation|quote/.test(pricing) ? 'rb-sx-catalog-quote' : undefined}>{pricing && !/quotation|quote/.test(pricing) ? pricing : 'Get a clear quote'}</b>{packages.length > 0 && <small>{service.category === 'food' ? 'First annual government fee included · No GST added · State/Central quoted separately' : 'No GST added · Government fees separate where applicable'}</small>}</div><div className="rb-entry-actions"><Link href={startHref} asChild><a className="rb-entry-start" aria-label={`Start: ${ui.title}`}>{registration ? 'Start application' : packages.length ? packages.length > 1 ? 'Compare packages' : 'Choose package' : service.category === 'gst_nil' ? 'Check nil eligibility' : service.category === 'gst' ? 'Open GST workspace' : 'Start application'} <span aria-hidden="true">↗</span></a></Link></div><p>{ui.audience}</p><div className="rb-sx-catalog-card-foot"><Link className="rb-entry-details" href={`/services/${service.slug}` as Href}>View details →</Link><a href={contact.telephoneHref} aria-label={`Call RegisterBox about ${ui.title}`}>Call our team ↗</a></div></div>
          </article>;
        })}</div>
        {!shown.length && <div className="rb-sx-no-results"><h2>No match yet.</h2><p>Try a different service name or ask our team.</p><button type="button" onClick={() => { setQuery(''); setGroup('All services'); }}>Show all services</button></div>}
      </section>
      <section className="rb-sa-answers" aria-labelledby="services-answers-title">
        <header><p className="rb-sx-kicker">BEFORE YOU CHOOSE</p><h2 id="services-answers-title">What should I check before paying for a service?</h2><p>Match the work to your business first. Then compare the documents, deliverables and total price.</p></header>
        <div className="rb-sa-answer-grid">
          <article aria-labelledby="services-home-question"><h3 id="services-home-question">I’m starting from home. Where should I begin?</h3><p>Describe what you will sell or make, the address you will use and whether you already have a registration. Home-based food, retail and service businesses can need different preparation. Bring those facts to the conversation before choosing a package.</p><Link href={publicServicePath('new') as Href}>Explore starting a business <span aria-hidden="true">↗</span></Link></article>
          <article aria-labelledby="services-existing-question"><h3 id="services-existing-question">I already have a registration. Should I apply again?</h3><p>Start by reviewing the existing record and the change you need. An address update, an additional activity or missing access may call for different work from a new application. Share the certificate and reference through your workspace so the team can agree the right scope.</p><Link href={publicServicePath('existing') as Href}>Review an existing business <span aria-hidden="true">↗</span></Link></article>
          <article aria-labelledby="services-price-question"><h3 id="services-price-question">Does the displayed price include government fees?</h3><p>Read the inclusion for the exact package. {foodPrice ? <>The FSSAI Basic package is {foodPrice}, including assistance for one eligible new registration at one premises and the first annual government registration fee. State and Central licences need a separate quote.</> : 'FSSAI Basic, State and Central applications have different scopes; check the current package or request a quote.'} Other services show their own fee notes; do not assume every package includes statutory charges.</p><Link href={publicServicePath('food') as Href}>See the FSSAI price and scope <span aria-hidden="true">↗</span></Link></article>
          <article aria-labelledby="services-documents-question"><h3 id="services-documents-question">Can I start before all my documents are ready?</h3><p>You can start your preparation and save a draft. Use the service checklist to see what is needed, then return to complete your details and upload the relevant records. The team can clarify missing evidence; a saved draft is not a government submission.</p><a href="#service-catalog">Find your service checklist <span aria-hidden="true">↑</span></a></article>
          <article aria-labelledby="services-diy-question"><h3 id="services-diy-question">Should I apply myself or use assistance?</h3><p>For routes such as Udyam and FSSAI, you can use the official portal directly. Official Udyam registration is free; optional RegisterBox preparation assistance is a separate service. Doing it yourself means managing the instructions, relevant records and follow-up. Paid assistance can help with the preparation work listed in your scope; it does not buy government approval. Choose based on the time and help you need.</p><div className="rb-sa-official-links"><a href="https://udyamregistration.gov.in/" target="_blank" rel="noopener noreferrer">Official Udyam portal <span aria-hidden="true">↗</span></a><a href="https://foscos.fssai.gov.in/" target="_blank" rel="noopener noreferrer">Official FoSCoS portal <span aria-hidden="true">↗</span></a></div></article>
          <article aria-labelledby="services-payment-question"><h3 id="services-payment-question">What does my payment receipt confirm?</h3><p>It confirms payment for the agreed RegisterBox package. Check the separate application status, official submission reference and issued record for the service outcome. Keep the package scope and receipt with your business documents so the next step stays clear.</p><Link href="/policies">Read the service information <span aria-hidden="true">↗</span></Link></article>
        </div>
        <aside className="rb-sa-recommendation" aria-labelledby="services-recommendation-title"><p className="rb-sx-kicker">REGISTERBOX RECOMMENDATION</p><h3 id="services-recommendation-title">Choose the scope before the price.</h3><p>Compare the same task: one new registration, an update to an existing record or an agreed period of recurring work. Ask which documents, government fees, follow-up and additional work are included. A lower price is useful only when the package covers what your business actually needs.</p></aside>
      </section>
      <aside className="rb-sx-catalog-help"><span aria-hidden="true">✦</span><div><h2>Not sure what you need?</h2><p>Just tell us what your business does. We’ll discuss your options.</p></div><a className="rb-button" href={`${contact.whatsapp}?text=${encodeURIComponent('Hi RegisterBox, I need help choosing a service for my Bengaluru business. My business does: ')}`} target="_blank" rel="noopener noreferrer">Help me choose ↗</a></aside>
    </main>
    <SiteFooter/>
  </div>;
}
