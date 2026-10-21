import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { WebBrand } from '@/components/website/brand.web';
import { Seo, siteUrl } from '@/components/website/seo.web';
import { contact } from '@/components/website/content';
import { publicServices } from '@/components/website/service-pages';
import { serviceDetails } from '@/components/website/service-details';
import { servicePresentation } from '@/components/website/service-presentation';

const groups = ['All services', 'Start a business', 'Registrations', 'Manage & comply'];
export default function ServicesPage() {
  const [group, setGroup] = useState('All services');
  const [query, setQuery] = useState('');
  const shown = publicServices.filter(service => (group === 'All services' || group === service.group) && `${service.title} ${service.detail} ${servicePresentation[service.category].title}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="rb-public-page rb-sx-page rb-sx-catalog">
    <Seo title="GST Filing, Registration & Business Services | RegisterBox" description="GST registration, free eligible nil GST filing, GST returns, company, LLP, FSSAI, shop licence and trademark support in Bengaluru. Explore RegisterBox services." path="/services" schema={[{ '@type': 'ItemList', itemListElement: publicServices.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.title, url: `${siteUrl}/services/${item.slug}` })) }]}/>
    <header className="rb-public-header rb-container"><WebBrand/><a href={contact.telephoneHref}>Call our team ↗</a></header>
    <main className="rb-container rb-sx-main">
      <section className="rb-sx-catalog-intro"><div className="rb-sx-kicker">BENGALURU BUSINESS SUPPORT</div><h1>Big plans.<br/><span>Simple next steps.</span></h1><p>Pick what you need. See the checklist. Talk to a real team.</p><div className="rb-sx-catalog-count"><span className="rb-sx-count-dot"/> New Thippasandra & Marathahalli</div></section>
      <section aria-label="Find a service">
        <div className="rb-sx-catalog-tools"><div className="rb-sx-catalog-filters" role="group" aria-label="Service category">{groups.map(item => <button type="button" key={item} aria-pressed={group === item} onClick={() => setGroup(item)}>{item}</button>)}</div><label className="rb-sx-catalog-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try GST, FSSAI or company" aria-label="Search services"/></label></div>
        <p className="rb-sx-result-count" role="status">{shown.length} {shown.length === 1 ? 'service' : 'services'}{query.trim() ? ` matching “${query.trim()}”` : ' to help you move forward'}</p>
        <div className="rb-sx-catalog-grid">{shown.map(service => {
          const ui = servicePresentation[service.category];
          const pricing = service.category === 'gst_nil' ? 'Free' : ['company', 'llp', 'gst_registration', 'food', 'retail', 'trademark'].includes(service.category) ? serviceDetails[service.category].pricing?.value : undefined;
          return <Link href={`/services/${service.slug}` as Href} key={service.slug} className={`rb-sx-catalog-card rb-sx-${ui.tone}`}>
            <div className="rb-sx-catalog-art"><img src={`/images/${ui.icon}-v1-136.webp`} width="76" height="76" alt="" loading="lazy"/><span>{service.group}</span></div>
            <div className="rb-sx-catalog-card-body"><h2>{ui.title}</h2><p>{ui.audience}</p><div className="rb-sx-catalog-card-fee"><small>{pricing && !/quotation|quote/.test(pricing) ? 'Assistance fee' : 'For your business'}</small><b>{pricing && !/quotation|quote/.test(pricing) ? pricing : 'Get a clear quote'}</b></div><span className="rb-sx-catalog-card-action">View service <span aria-hidden="true">↗</span></span></div>
          </Link>;
        })}</div>
        {!shown.length && <div className="rb-sx-no-results"><h2>No match yet.</h2><p>Try a different service name or ask our team.</p><button type="button" onClick={() => { setQuery(''); setGroup('All services'); }}>Show all services</button></div>}
      </section>
      <aside className="rb-sx-catalog-help"><span aria-hidden="true">✦</span><div><h2>Not sure what you need?</h2><p>Just tell us what your business does. We’ll discuss your options.</p></div><a className="rb-button" href={`${contact.whatsapp}?text=${encodeURIComponent('Hi RegisterBox, I need help choosing a service for my Bengaluru business. My business does: ')}`} target="_blank" rel="noopener noreferrer">Help me choose ↗</a></aside>
      <footer className="rb-sx-footer"><WebBrand/><Link href="/contact">Contact & branches ↗</Link></footer>
    </main>
  </div>;
}
