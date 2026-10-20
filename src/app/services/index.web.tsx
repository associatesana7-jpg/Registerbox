import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { WebBrand } from '@/components/website/brand.web';
import { contact, servicePath } from '@/components/website/content';
import { Seo, siteUrl } from '@/components/website/seo.web';
import { publicServices } from '@/components/website/service-pages';
import { useApp } from '@/hooks/use-app';
import '@/components/website/service-directory.css';

const groups = ['All services', 'Start a business', 'Registrations', 'Manage & comply'];

export default function ServicesPage() {
  const { session } = useApp();
  const [group, setGroup] = useState('All services');
  const [query, setQuery] = useState('');
  const search = query.trim().toLocaleLowerCase();
  const visible = publicServices.filter(item => (group === 'All services' || item.group === group)
    && `${item.title} ${item.detail} ${'tag' in item ? item.tag : ''} ${item.category}`.toLocaleLowerCase().includes(search));
  const reset = () => { setQuery(''); setGroup('All services'); };

  return <div className="rb-public-page rb-sd-page">
    <Seo title="Business Registration & Compliance Services | RegisterBox" description="Explore company, LLP, GST, food business and shop registration preparation, plus business compliance workspaces. Find your next step with RegisterBox." path="/services" schema={[{'@type':'ItemList',itemListElement:publicServices.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.title,url:`${siteUrl}/services/${item.slug}`}))}]}/>
    <a href="#services-list" className="rb-skip">Skip to services</a>
    <header className="rb-sd-header rb-container">
      <WebBrand/>
      <nav aria-label="Website"><Link href="/">Home</Link><Link href="/contact">Contact us <span aria-hidden="true">↗</span></Link></nav>
    </header>
    <main className="rb-container rb-sd-main">
      <section className="rb-sd-intro" aria-labelledby="services-title">
        <div>
          <p className="rb-sd-eyebrow">YOUR NEXT BUSINESS STEP</p>
          <h1 id="services-title">Choose your service.<br/><span>We’ll help you get started.</span></h1>
          <p className="rb-sd-lead">From a new idea to your next GST return, find the right place to begin. Start your application or read the details first.</p>
          <div className="rb-sd-intro-links"><a href="#services-list">Find my service <span aria-hidden="true">↓</span></a><Link href="/contact">Help me choose <span aria-hidden="true">↗</span></Link></div>
        </div>
        <aside className="rb-sd-how" aria-label="How to get started">
          <p>ONE CLEAR PATH FORWARD</p>
          <ol>
            <li><span aria-hidden="true">01</span><div><strong>Choose what you need</strong><small>Start with your business or registration.</small></div></li>
            <li><span aria-hidden="true">02</span><div><strong>Add your details</strong><small>Sign in and prepare your information.</small></div></li>
            <li><span aria-hidden="true">03</span><div><strong>Review the next steps</strong><small>Confirm the scope and documents needed.</small></div></li>
          </ol>
        </aside>
      </section>

      <section id="services-list" className="rb-sd-directory" aria-labelledby="directory-title">
        <div className="rb-sd-list-heading"><div><p className="rb-sd-eyebrow">FIND YOUR STARTING POINT</p><h2 id="directory-title">Services for your business</h2></div><label className="rb-sd-search"><span className="rb-sd-search-symbol" aria-hidden="true">⌕</span><span className="rb-sd-sr-only">Search services</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search GST, company, food…" aria-controls="service-results"/></label></div>
        <div className="rb-sd-filter-row"><div className="rb-sd-filters" role="group" aria-label="Filter services by category">{groups.map(item => <button type="button" key={item} aria-pressed={group === item} onClick={() => setGroup(item)}>{item}</button>)}</div><p className="rb-sd-count" role="status" aria-live="polite">{visible.length} {visible.length === 1 ? 'service' : 'services'}</p></div>
        <div className="rb-sd-grid" id="service-results">
          {visible.map(item => {
            const enquiry = item.category === 'trademark';
            const gst = item.category === 'gst';
            const destination = servicePath(item.category);
            const startHref: Href = enquiry || session ? destination as Href : { pathname: '/auth', params: { next: destination } };
            const action = enquiry ? 'Send an enquiry' : gst ? 'Open GST workspace' : 'Start application';
            return <article className="rb-sd-card" key={item.slug} aria-labelledby={`service-${item.category}`}>
              <div className="rb-sd-card-top"><img src={`/images/${'icon' in item ? item.icon : 'business-check'}-v1.webp`} width={72} height={72} alt="" loading="lazy" decoding="async"/><span>{item.group}</span></div>
              <h3 id={`service-${item.category}`}>{item.title}</h3>
              <p>{item.detail}</p>
              <small>{enquiry ? 'Discuss the application with our team' : gst ? 'Connect, prepare and review' : 'Guided application preparation'}</small>
              <div className="rb-sd-card-actions"><Link href={startHref} className="rb-sd-start" aria-label={`${action}: ${item.title}`}>{action}<span aria-hidden="true">→</span></Link><Link href={`/services/${item.slug}` as Href} className="rb-sd-details" aria-label={`View details: ${item.title}`}>View details <span aria-hidden="true">↗</span></Link></div>
            </article>;
          })}
        </div>
        {visible.length === 0 && <div className="rb-sd-empty"><h3>No services match that search</h3><p>Try “GST”, “company” or “food”, or see the full list.</p><button type="button" onClick={reset}>Show all services</button><Link href="/contact">Ask our team for help →</Link></div>}
        <p className="rb-sd-preparation-note">Applications begin with preparation. Government submission, review and approval are separate steps, confirmed for your business and the service you choose.</p>
      </section>

      <section className="rb-sd-support" aria-labelledby="help-title"><div><p className="rb-sd-eyebrow">A LITTLE CLARITY HELPS</p><h2 id="help-title">Not sure which service fits?</h2><p>Tell us what your business does and what you’re planning next. We’ll help you find a starting point.</p></div><Link href="/contact">Discuss your business <span aria-hidden="true">↗</span></Link></section>
    </main>
    <footer className="rb-sd-footer rb-container"><p>RegisterBox · Bengaluru, India</p><nav aria-label="Footer"><a href={`mailto:${contact.email}`}>Email our team</a><Link href="/policies">Privacy & service information</Link></nav></footer>
  </div>;
}
