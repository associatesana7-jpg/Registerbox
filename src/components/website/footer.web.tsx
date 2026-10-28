import { Link, type Href } from 'expo-router';
import { WebBrand } from './brand.web';
import { branches, contact, services } from './content';
import { publicServicePath } from './service-pages';
import './footer.css';

function LocationPin() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" aria-hidden="true"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>;
}

/** Shared public-site footer. Addresses remain readable without the Google embed. */
export function SiteFooter() {
  const marathahalli = branches.find(branch => branch.id === 'marathahalli')!;
  const thippasandra = branches.find(branch => branch.id === 'new-thippasandra')!;
  return <footer className="rb-site-footer">
    <div className="rb-site-footer-inner">
      <div className="rb-site-footer-heading">
        <div><span className="rb-site-footer-kicker">ONLINE, AND JUST AROUND THE CORNER</span><h2>Come say hello<span>.</span></h2></div>
        <p>Two Bengaluru branches.<br/>One team to help you move forward.</p>
      </div>
      <section className="rb-footer-location" id="bengaluru-branches" aria-label="RegisterBox locations in Bengaluru">
        <div className="rb-footer-map">
          <iframe
            title="RegisterBox Marathahalli location on Google Maps"
            src={`${contact.googleProfile}&output=embed&z=16`}
            width="640"
            height="360"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
        <div className="rb-footer-branches">
          <div className="rb-footer-primary-branch">
            <span className="rb-footer-location-label"><LocationPin/> FIND US IN BENGALURU</span>
            <h3>RegisterBox · {marathahalli.name}</h3>
            <address>{marathahalli.address}</address>
            <div className="rb-footer-map-actions"><a className="rb-footer-directions" href="https://www.google.com/maps/dir/?api=1&destination=12.9547917%2C77.6944716" target="_blank" rel="noopener noreferrer">Get directions <span aria-hidden="true">↗</span></a><a href={contact.googleProfile} target="_blank" rel="noopener noreferrer">Open Google Maps <span aria-hidden="true">↗</span></a></div>
          </div>
          <div className="rb-footer-other-branch"><div><h3>{thippasandra.name}</h3><address>{thippasandra.address}</address></div><a href={thippasandra.maps} target="_blank" rel="noopener noreferrer" aria-label="Get directions to RegisterBox New Thippasandra"><span aria-hidden="true">↗</span></a></div>
          <p className="rb-footer-visit-note">Planning a visit? <a href={contact.telephoneHref}>Call us first</a> so we can be ready for you.</p>
        </div>
      </section>
      <div className="rb-site-footer-links">
        <div className="rb-site-footer-about"><WebBrand/><p>Less paperwork. More possibility.<br/>Your business journey, brought together.</p><span className="rb-footer-local-note"><span aria-hidden="true"/> Built for business in India</span></div>
        <nav aria-label="Business services"><h3>Start & grow</h3>{services.slice(0, 5).map(service => <Link key={service.category} href={publicServicePath(service.category) as Href}>{service.title}</Link>)}<Link href="/services">Explore all services <span aria-hidden="true">↗</span></Link></nav>
        <nav aria-label="RegisterBox resources"><h3>Make your next move</h3><Link href={'/tools' as Href}>All free tools</Link><Link href={'/tools/business-licence-checker' as Href}>Business licence checker</Link><Link href={'/tools/pdf-converter' as Href}>Free PDF converter</Link><Link href={'/tools/indian-language-typing' as Href}>Indian language typing</Link><Link href="/services/gst-returns">GST return support</Link><Link href={'/blog' as Href}>Business guides</Link><Link href="/dashboard">Your workspace</Link><Link href="/contact">Contact & branches</Link><Link href={'/blog/editorial-policy' as Href}>How we write our guides</Link></nav>
        <div className="rb-site-footer-contact"><h3>A message away</h3><a className="rb-footer-phone" href={contact.telephoneHref}>{contact.phone}</a><a href={contact.whatsapp} target="_blank" rel="noopener noreferrer">Chat on WhatsApp <span aria-hidden="true">↗</span></a><a href={`mailto:${contact.email}`}>{contact.email}</a><a href={contact.callback} target="_blank" rel="noopener noreferrer">Request a callback <span aria-hidden="true">↗</span></a></div>
      </div>
      <div className="rb-site-footer-bottom"><span>© {new Date().getFullYear()} RegisterBox. All rights reserved.</span><nav aria-label="Privacy and service information"><Link href="/privacy">Privacy & data</Link><Link href={{ pathname: '/policies', params: { section: 'service' } }}>Service information</Link><Link href="/delete-account">Data deletion</Link></nav></div>
    </div>
  </footer>;
}
