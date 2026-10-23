import { SiteFooter } from '@/components/website/footer.web';
import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { useApp } from '@/hooks/use-app';
import { WebBrand } from '@/components/website/brand.web';
import { Seo, siteUrl } from '@/components/website/seo.web';
import { contact } from '@/components/website/content';
import '@/components/website/service-entry.css';
import '@/components/website/service-experience.css';
import { publicServices, publicServiceStartPath, servicePackagesForCategory } from '@/components/website/service-pages';
import { serviceDetails } from '@/components/website/service-details';
import { servicePresentation } from '@/components/website/service-presentation';
import { packagePrice } from '@/components/website/service-packages.web';

const groups = ['All services', 'Start a business', 'Registrations', 'Manage & comply'];
export default function ServicesPage() {
  const { session } = useApp();
  const [group, setGroup] = useState('All services');
  const [query, setQuery] = useState('');
  const shown = publicServices.filter(service => (group === 'All services' || group === service.group) && `${service.title} ${service.detail} ${servicePresentation[service.category].title}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="rb-public-page rb-sx-page rb-sx-catalog">
    <Seo title="GST Filing, Registration & Business Services | RegisterBox" description="Compare GST, FSSAI, Udyam, shop licence, trademark, DSC, ITR and annual compliance packages. Clear RegisterBox fees with no GST added. Eligible nil GST filing is free." path="/services" schema={[{ '@type': 'ItemList', itemListElement: publicServices.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.title, url: `${siteUrl}/services/${item.slug}` })) }]}/>
    <header className="rb-public-header rb-container"><WebBrand/><a href={contact.telephoneHref}>Call our team ↗</a></header>
    <main className="rb-container rb-sx-main">
      <section className="rb-sx-catalog-intro"><div className="rb-sx-kicker">BENGALURU BUSINESS SUPPORT</div><h1>Big plans.<br/><span>Simple next steps.</span></h1><p>Pick your service. See the checklist. Start online.</p><div className="rb-sx-catalog-count"><span className="rb-sx-count-dot"/> New Thippasandra & Marathahalli</div></section>
      <aside className="rb-sx-catalog-help"><span aria-hidden="true">₹0</span><div><h2>Nil GST filing. Zero service fee.</h2><p>Eligible nil GSTR-1 and GSTR-3B returns stay free. Check eligibility and your filing period first.</p></div><Link className="rb-button" href={'/services/free-nil-gst-filing' as Href}>Explore free nil filing ↗</Link></aside>
      <section aria-label="Find a service">
        <div className="rb-sx-catalog-tools"><div className="rb-sx-catalog-filters" role="group" aria-label="Service category">{groups.map(item => <button type="button" key={item} aria-pressed={group === item} onClick={() => setGroup(item)}>{item}</button>)}</div><label className="rb-sx-catalog-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try GST, FSSAI or company" aria-label="Search services"/></label></div>
        <p className="rb-sx-result-count" role="status">{shown.length} {shown.length === 1 ? 'service' : 'services'}{query.trim() ? ` matching “${query.trim()}”` : ' to help you move forward'}</p>
        <div className="rb-sx-catalog-grid">{shown.map(service => {
          const ui = servicePresentation[service.category];
          const packages = servicePackagesForCategory(service.category);
          const registration = ['gst_registration', 'food', 'retail', 'udyam'].includes(service.category);
          const pricing = service.category === 'gst_nil' ? '₹0' : packages.length ? `${packages.length > 1 ? 'From ' : ''}${packagePrice(Math.min(...packages.map(item => item.amountPaise)))}` : ['company', 'llp'].includes(service.category) ? serviceDetails[service.category]?.pricing?.value : undefined;
          const destination = publicServiceStartPath(service.category);
          const startHref: Href = packages.length || session ? destination as Href : { pathname: '/auth', params: { next: destination } };
          return <article key={service.slug} className={`rb-sx-catalog-card rb-sx-${ui.tone}`}>
            <div className="rb-sx-catalog-art"><img src={`/images/${ui.icon}-v1-136.webp`} width="76" height="76" alt="" loading="lazy"/><span>{service.group}</span></div>
            <div className="rb-sx-catalog-card-body"><h2><Link href={`/services/${service.slug}` as Href}>{ui.title}</Link></h2><p>{ui.audience}</p><div className="rb-sx-catalog-card-fee"><small>{pricing && !/quotation|quote/.test(pricing) ? 'Assistance fee' : 'For your business'}</small><b>{pricing && !/quotation|quote/.test(pricing) ? pricing : 'Get a clear quote'}</b>{packages.length > 0 && <small>No GST added · Government fees separate where applicable</small>}</div><div className="rb-entry-actions"><Link className="rb-entry-start" href={startHref} aria-label={`Start: ${ui.title}`}>{registration ? 'Start application' : packages.length ? packages.length > 1 ? 'Compare packages' : 'Continue to checkout' : service.category === 'gst_nil' ? 'Check nil eligibility' : service.category === 'gst' ? 'Open GST workspace' : 'Start application'} <span aria-hidden="true">↗</span></Link><Link className="rb-entry-details" href={`/services/${service.slug}` as Href}>View details →</Link></div></div>
          </article>;
        })}</div>
        {!shown.length && <div className="rb-sx-no-results"><h2>No match yet.</h2><p>Try a different service name or ask our team.</p><button type="button" onClick={() => { setQuery(''); setGroup('All services'); }}>Show all services</button></div>}
      </section>
      <aside className="rb-sx-catalog-help"><span aria-hidden="true">✦</span><div><h2>Not sure what you need?</h2><p>Just tell us what your business does. We’ll discuss your options.</p></div><a className="rb-button" href={`${contact.whatsapp}?text=${encodeURIComponent('Hi RegisterBox, I need help choosing a service for my Bengaluru business. My business does: ')}`} target="_blank" rel="noopener noreferrer">Help me choose ↗</a></aside>
    </main>
    <SiteFooter/>
  </div>;
}
