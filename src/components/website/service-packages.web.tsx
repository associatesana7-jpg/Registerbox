import { Link, type Href } from 'expo-router';
import { useApp } from '@/hooks/use-app';
import { servicePackagesForCategory } from './service-pages';
import { contact, servicePath } from './content';
import './service-packages.css';

export function packagePrice(amountPaise: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amountPaise / 100);
}

export function ServicePackages({ category }: { category: string }) {
  const { session } = useApp();
  const packages = servicePackagesForCategory(category);
  if (!packages.length) return null;
  const food = category === 'food';
  const foodHref: Href = session ? servicePath('food') as Href : { pathname: '/auth', params: { next: servicePath('food') } };
  return <section className="rb-packages" id="packages" aria-labelledby="packages-title">
    <div className="rb-packages-heading"><div><div className="rb-sx-kicker">CLEAR PRICES. A CLEAR NEXT STEP.</div><h2 id="packages-title">Choose the support you need.</h2></div><p>{food ? `The ${packagePrice(packages[0].amountPaise)} Basic Registration package includes the first annual government registration fee. No GST is added. Eligibility is reviewed first; State and Central licences need a separate quote.` : 'The price shown is your RegisterBox service fee. No GST is added. Government charges, where applicable, are separate.'}</p></div>
    <div className={`rb-packages-grid ${packages.length === 1 ? 'rb-packages-single' : ''}`}>
      {packages.map((item, index) => <article className={`rb-package ${index === 0 ? 'rb-package-featured' : ''}`} key={item.id} id={`package-${item.id}`}>
        <div className="rb-package-topline"><span>{item.tag || 'REGISTERBOX SUPPORT'}</span><span aria-hidden="true">0{index + 1}</span></div>
        <h3>{item.title}</h3><p className="rb-package-description">{item.description}</p>
        <div className="rb-package-decision">
          <div className="rb-package-price">{packagePrice(item.amountPaise)}<small>{item.billingLabel}</small></div>
          <p className="rb-package-tax-note">{food ? 'First annual government registration fee included · No GST added' : 'No GST added to this service fee'}</p>
          <div className="rb-package-actions"><Link href={food ? foodHref : `/checkout?package=${item.id}` as Href} asChild><a className="rb-button" aria-label={food ? 'Start your FSSAI application for eligibility review' : `Continue with ${item.title} for ${packagePrice(item.amountPaise)}`}>{food ? 'Start FSSAI application' : 'Choose this package'} <span aria-hidden="true">↗</span></a></Link><a className="rb-package-call" href={contact.telephoneHref}>Questions? Call our team <span aria-hidden="true">↗</span></a></div>
          <small className="rb-package-payment-note">{food ? 'Complete your details; eligibility review and payment follow' : 'Review your details before secure payment'}</small>
          <p className="rb-package-fee-note">{item.feeNote}</p>
        </div>
        <details className="rb-package-details"><summary><span>What’s included <small>{item.includes.length} support items</small></span><span className="rb-package-toggle" aria-hidden="true">+</span></summary><ul>{item.includes.map(inclusion => <li key={inclusion}><span aria-hidden="true">✓</span>{inclusion}</li>)}</ul></details>
      </article>)}
    </div>
    {(category === 'gst' || category === 'gst_registration' || category === 'proprietorship') && <aside className="rb-package-nil"><span className="rb-package-nil-price">₹0</span><div><h3>Nil GST filing stays free.</h3><p>Eligible nil GSTR-1 and GSTR-3B returns have a ₹0 RegisterBox service fee. Eligibility checks and your filing authorisation still apply. Statutory dues, if any, remain payable.</p></div><Link href={'/services/free-nil-gst-filing' as Href}>Check nil eligibility <span aria-hidden="true">↗</span></Link></aside>}
  </section>;
}
