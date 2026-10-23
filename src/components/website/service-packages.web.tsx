import { Link, type Href } from 'expo-router';
import { servicePackagesForCategory } from './service-pages';
import './service-packages.css';

export function packagePrice(amountPaise: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amountPaise / 100);
}

export function ServicePackages({ category }: { category: string }) {
  const packages = servicePackagesForCategory(category);
  if (!packages.length) return null;
  return <section className="rb-packages" id="packages" aria-labelledby="packages-title">
    <div className="rb-packages-heading"><div><div className="rb-sx-kicker">CLEAR PRICES. A CLEAR NEXT STEP.</div><h2 id="packages-title">Choose the support you need.</h2></div><p>The price shown is your RegisterBox service fee. No GST is added. Government charges, where applicable, are separate.</p></div>
    <div className={`rb-packages-grid ${packages.length === 1 ? 'rb-packages-single' : ''}`}>
      {packages.map((item, index) => <article className={`rb-package ${index === 0 ? 'rb-package-featured' : ''}`} key={item.id} id={`package-${item.id}`}>
        <div className="rb-package-topline"><span>{item.tag || 'REGISTERBOX SUPPORT'}</span><span aria-hidden="true">0{index + 1}</span></div>
        <h3>{item.title}</h3><p className="rb-package-description">{item.description}</p>
        <div className="rb-package-price">{packagePrice(item.amountPaise)}<small>{item.billingLabel}</small></div>
        <p className="rb-package-tax-note">No GST added to this service fee</p>
        <div className="rb-package-included">What’s included</div>
        <ul>{item.includes.map(inclusion => <li key={inclusion}><span aria-hidden="true">✓</span>{inclusion}</li>)}</ul>
        <div className="rb-package-footer"><p>{item.feeNote}</p><Link className="rb-button" href={`/checkout?package=${item.id}` as Href} aria-label={`Continue with ${item.title} for ${packagePrice(item.amountPaise)}`}>Continue <span aria-hidden="true">↗</span></Link><small>Review your details before secure payment</small></div>
      </article>)}
    </div>
    {(category === 'gst' || category === 'gst_registration' || category === 'proprietorship') && <aside className="rb-package-nil"><span className="rb-package-nil-price">₹0</span><div><h3>Nil GST filing stays free.</h3><p>Eligible nil GSTR-1 and GSTR-3B returns have a ₹0 RegisterBox service fee. Eligibility checks and your filing authorisation still apply. Statutory dues, if any, remain payable.</p></div><Link href={'/services/free-nil-gst-filing' as Href}>Check nil eligibility <span aria-hidden="true">↗</span></Link></aside>}
  </section>;
}
